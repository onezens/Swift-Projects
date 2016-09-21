//
//  BaseViewController.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/21.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit

enum ToastType : NSInteger {
    case ToastError     =   1
    case ToastWarn      =   2
    case ToastSuccess   =   3
}

class BaseViewController: UIViewController {

    lazy var leftBarBtn : UIButton = {
       return UIButton()
    }()
    
    lazy var rightBarBtn : UIButton = {
        return UIButton()
    }()
    
    lazy var rightSecBarBtn : UIButton = {
        return UIButton ()
    }()
    
    
    
    // MARK: - public method
    func setUpUI() -> Void {
        
    }
    
    func checkLogin() -> Bool {
        return true
    }
    
    func setLeftBarBtn(image: UIImage, hlImage: UIImage) {
        
    }
    
    func setRightBarBtn(image: UIImage, hlImage: UIImage) -> Void {
        
    }
    
    func setRightSecBarBtn(image: UIImage, hlImage: UIImage) -> Void {
        
    }
    
    func setLeftBarBtn(image: UIImage, hlImage: UIImage, text: String) -> Void {
        
    }
    
    func setLeftBackBarBtn() -> Void {
        
    }
    
    func setLeftBarBtn(text: String) -> Void {
        
    }
    
    func setRightBarBtn(text: String) -> Void {
        
    }
    
    func goBack() -> Void {
        
    }
    
    func requestSuccess() -> Void {
        
    }
    
    func requestFailed() -> Void {
        
    }
    
    func showLoadingView() -> Void {
        
    }
    
    func dismissLoadingView() -> Void {
        
    }
    
    func showEmptyLoadingView() -> Void {
        
    }
    
    func showEmptyLoadingView(text: String) -> Void {
        
    }
    
    func dismissEmptyLoadingView() -> Void {
        
    }
    
    func showUnloginView() -> Void {
        
    }
    
    func dismissUnloginView() -> Void {
        
    }
    
    func showNoNetworkView() -> Void {
        
    }
    
    func dismissNoNetworkView() -> Void {
        
    }
    
    func noNetworkBtnClick() -> Void {
        
    }
    
    func showToastWithType(type: ToastType, text: String) {
        
        
    }
    
    func showNoNetworkToast() -> Void {
        
    }
    
    func showEmptyView() -> Void {
        
    }
    
    func dismissEmptyView() -> Void {
        
    }
    
    
    // MARK: - private method
    

    // MARK: - override method
    
    override func viewDidLoad() {
        
        super.viewDidLoad()
        setUpUI()
    }


    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        
    }
    


}
