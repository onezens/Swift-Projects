//
//  ViewController.swift
//  WSJianShu
//
//  Created by wangzhen on 16/9/21.
//  Copyright © 2016年 www.wackosix.cn. All rights reserved.
//

import UIKit

class ViewController: BaseViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        
        view.backgroundColor = UIColor.white
        title = "测试控制器"
        setRightBarBtn(text: "right")
        setLeftBarBtn(text: "left")
        rightBarBtn.addTarget(self, action: #selector(ViewController.go), for: .touchUpInside)
        showLoadingView()
        perform(#selector(ViewController.delayFunc), with: self, afterDelay: 3)
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    func delayFunc() -> Void {
        
        dismissLoadingView()
    }
    
    func go() -> Void {
        
        let vc = BaseViewController()
        vc.title = "测试控制器二"
        navigationController?.pushViewController(vc, animated: true)
    }


}

