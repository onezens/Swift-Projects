//
//  UIImage+Common.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/22.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit

extension UIImage {
    
    
    ///  压缩图片
    ///
    ///  - parameter image: 需要压缩的图片
    ///  - parameter size:  需要压缩后的尺寸
    ///
    ///  - returns: 压缩后的图片
    class func compressImage(image: UIImage, size: CGSize) -> UIImage {
        
        UIGraphicsBeginImageContext(size)
        image.draw(in: CGRect(origin: CGPoint.zero, size: size))
        let image = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return image!
    }
    
    ///  重新渲染图片，并且设置填充颜色
    class func renderImage(image: UIImage,size: CGSize, renderColor: UIColor) -> UIImage {
        
        UIGraphicsBeginImageContextWithOptions(size, false, UIScreen.main.scale)
        let rect = CGRect(origin: CGPoint.zero, size: size)
        renderColor.setFill()
        UIRectFill(rect)
        image.draw(in: rect, blendMode: .destinationIn, alpha: 1.0)
        let image = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return image!.withRenderingMode(.alwaysOriginal)
    }
    
    ///  将一张图片压缩之后，转换成NSData,图片小于 500 * 1024 B = 500kB
    ///
    func compressImageToData(image: UIImage) -> Data {
        
        var data = UIImageJPEGRepresentation(image, 0.8)!
        
        if data.count > 500 * 1024 {
            
            data = UIImageJPEGRepresentation(UIImage.compressImage(image: image, size: CGSize(width: 1024.0, height: image.size.height/image.size.width * 1024.0)), 0.8)!
        }
        return data
    }
    
    func viewShoot(view: UIView) -> UIImage {
        
        UIGraphicsBeginImageContextWithOptions(view.bounds.size, false, UIScreen.main.scale)
        
        view.layer.render(in: UIGraphicsGetCurrentContext()!)
        
        let image = UIGraphicsGetImageFromCurrentImageContext()
        
        UIGraphicsEndImageContext()
        
        return image!
    }

}
